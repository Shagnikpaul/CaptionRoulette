package org.shagnik.backend.repository;

import org.shagnik.backend.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {

    Optional<Tag> findByName(String name);

    // Batch lookup to avoid N+1 queries when resolving a post's tag list
    List<Tag> findByNameIn(Collection<String> names);

    List<Tag> findTop10ByNameContainingIgnoreCaseOrderByNameAsc(String query);
}